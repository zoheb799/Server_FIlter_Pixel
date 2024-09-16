import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path'; // Import path module
import { connectDatabase } from './config/db';
import router from './routes/routes';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000; // Default to 5000 if PORT is not defined

connectDatabase();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/v1', router);

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
