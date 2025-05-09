const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connect to MongoDB'))
    .catch(err => console.log('MongoDB connection error:', error));

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date },
    category: { type: String },
    completed: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema)
const Task = mongoose.model('Task', taskSchema)

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' })
    }
}

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'ต้องระบบ username และ password' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering', error });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Username หรือ password ผิด' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Username หรือ password ผิด' });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, userId: user._id, username });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
});

app.get('/tasks', authMiddleware, async (req, res) => {
    try {
        const { category, completed } = req.query;
        const query = { userId: req.userId }
        if (category) query.category = category;
        if (completed !== undefined) query.completed = completed === 'true';
        const tasks = await Task.find(query).sort({ dueDate: -1 });
        res.json(tasks);

    } catch (error) {
        res.status(500).json({ message: 'Error fetching tasks', error });
    }

});

app.post('/tasks', authMiddleware, async (req, res) => {
    try {
        const { title, description, dueDate, category } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'ต้องระบุ title' });
        }
        const task = new Task({
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : null,
            category,
            userId: req.userId
        });
        await task.save();
        res.status(201).json(task);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating task', error });
    }
});

app.put('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: 'ไม่พบงาน' })
        }
        if (task.userId.toString() !== req.userId) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขงานนี้' });
        }
        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : task.dueDate;
        task.category = req.body.category || task.category;
        task.completed = req.body.completed !== undefined ? req.body.completed : task.completed;
        await task.save()
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task', error });
    }
});

app.delete('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: 'ไม่พบงาน' });
        }
        if (task.userId.toString() !== req.userId) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบงานนี้' });
        }
        await Task.findByIdAndDelete(id);
        res.json({ message: 'งานถูกลบแล้ว' })
    } catch (error) {
        res.status(500).json({ message: 'Error deleting task', error });
    }
})

app.listen(3000, () => console.log('Server running on port 3000'));