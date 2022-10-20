const Photo = require('../models/photo.model');
const sanitize = require('mongo-sanitize');

const Voter = require('../models/voter.model');
const requestIp = require('request-ip');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {

  try {
    const title = sanitize(req.fields.title);
    const author = sanitize(req.fields.author);
    const email = sanitize(req.fields.email);
    const file = req.files.file;

    const pattern = new RegExp('^[A-Za-z]+$');

    const titleMatched = title.match(pattern).join('');
    if (titleMatched.length < title.length) throw new Error('Invalid characters...');

    const authorMatched = author.match(pattern).join('');
    if (authorMatched.length < author.length) throw new Error('Invalid characters...');

    const patternEmail = new RegExp('[a-z0-9]+@[a-z]+\.[a-z]{2,3}');
    const emailMatched = email.match(patternEmail).join('');
    if (emailMatched.length < email.length) throw new Error('Invalid characters...');

    if (title && author && email && file) { // if fields are not empty...
      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const fileExt = fileName.split('.').slice(-1)[0];
      if ((fileExt === 'gif' || fileExt === 'jpg' || fileExt === 'png') && (title.length <= 25) && (author.length <= 50)) {
        const newPhoto = new Photo({
          title,
          author,
          email,
          src: fileName,
          votes: 0
        });
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);
      } else {
        throw new Error('Wrong input!');
      }

    } else {
      throw new Error('Wrong input!');
    }

  } catch (err) {
    res.status(500).json(err);
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {

  try {
    const id = req.params.id;
    const photoToUpdate = await Photo.findOne({
      _id: id
    });
    const clientIp = requestIp.getClientIp(req);
    const voter = await Voter.findOne({
      user: clientIp
    });

    if (voter) {
      const findPhoto = voter.votes.includes(id)
      if (!findPhoto) {
        voter.votes.push(id);
        voter.save();
      } else {
        throw new Error('You can\'t vote again!');
      }

    } else {
      let votes = [];
      votes.push(id)
      const newVoter = await new Voter({
        user: clientIp,
        votes: votes
      });
      await newVoter.save();
      res.json(newVoter);
    }

    if (!photoToUpdate) res.status(404).json({
      message: 'Not found'
    });
    else {
      photoToUpdate.votes++;
      photoToUpdate.save();
      res.json('Ok')
    }
  } catch (err) {
    res.status(500).json(err);
  }
};