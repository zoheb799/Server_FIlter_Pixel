import express from 'express';
import { login, logout, register } from '../controllers/authcontrollers';
import { isAuthenticated } from '../middlewares/auth';
import {
  saveImage,
  getAllImages,
  getImageById,
  updateImage,
  downloadImage,
  deleteImage,
  uploadImage
} from '../controllers/imagecontroller';
import path from 'path';
import fs from 'fs';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello World!');
  });
  
router.post('/register', register);
router.post('/login', login);
router.post('/logout', isAuthenticated, logout);
router.post('/upload', isAuthenticated,uploadImage, saveImage);              // Upload and save image
router.get('/images', isAuthenticated, getAllImages);                               // Fetch all images
router.get('/:id',isAuthenticated, getImageById);                            // Fetch single image by ID
router.put('/image/:id',isAuthenticated, updateImage);                             // Update image metadata (real-time processing)
router.get('/:id/download',isAuthenticated, downloadImage);                  // Download processed image
router.delete('/:id',isAuthenticated, deleteImage); 
router.get('/image/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '..', 'uploads', filename);

  // Check if file exists
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath); // Serve the file
  } else {
    res.status(404).json({ message: 'Image not found' }); // Handle if the file doesn't exist
  }
});



export default router;