const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get('/', async (req, res) => {
    try {
        const events = await Event.find()
            .populate('organizer', 'name email')
            .populate('participants', 'name email')
            .sort({ date: 1 });
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'name email')
            .populate('participants', 'name email');
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        res.json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, description, eventType, date, location, maxParticipants } = req.body;
        
        const event = new Event({
            title,
            description,
            eventType,
            date,
            location,
            maxParticipants,
            organizer: req.user.id,
            image: req.file ? req.file.path : ''
        });

        await event.save();
        res.status(201).json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { title, description, eventType, date, location, maxParticipants } = req.body;
        
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.organizer.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        event.title = title || event.title;
        event.description = description || event.description;
        event.eventType = eventType || event.eventType;
        event.date = date || event.date;
        event.location = location || event.location;
        event.maxParticipants = maxParticipants || event.maxParticipants;
        event.image = req.file ? req.file.path : event.image;

        await event.save();
        res.json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.organizer.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await event.remove();
        res.json({ message: 'Event removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const events = await Event.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { eventType: { $regex: query, $options: 'i' } }
            ]
        })
        .populate('organizer', 'name email')
        .populate('participants', 'name email')
        .sort({ date: 1 });

        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 