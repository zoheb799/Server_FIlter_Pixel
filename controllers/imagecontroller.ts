import sharp from 'sharp';
import path from 'path';
import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import Image from '../models/imageModel'; // Adjust path if necessary

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);
    if (extname && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

// 1. Image Upload and Save Metadata
export const uploadImage = upload.single('image');

export const saveImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const newImage = new Image({
      filename: req.file.filename,
      format: req.file.mimetype.includes('png') ? 'png' : 'jpeg', // Detect format from MIME type
      status: 'uploaded'
    });

    const savedImage = await newImage.save();
    res.status(201).json({ ...savedImage.toObject(), filename: req.file.filename });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Failed to save image', error: error.message });
    } else {
      res.status(500).json({ message: 'Failed to save image', error: 'An unknown error occurred' });
    }
  }
};

// 2. Update Image with Adjustments (Brightness, Contrast, Saturation, Rotation)
export const updateImage = async (req: Request, res: Response) => {
  try {
    const { brightness, contrast, saturation, rotation, format } = req.body; // Extract values from request body
    const imageId = req.params.id; // Extract image ID from params

    // Find image by ID
    const image = await Image.findById(imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const originalFilePath = path.join(__dirname, '..', 'uploads', image.filename);

    // Check if the filename already contains 'updated_'
    let updatedFileName;
    if (image.filename.startsWith('updated_')) {
      // If it already starts with 'updated_', use the same filename
      updatedFileName = image.filename;
    } else {
      // If not, prepend 'updated_' to avoid multiple 'updated_' prefixes
      updatedFileName = `updated_${image.filename}`;
    }

    const updatedFilePath = path.join(__dirname, '..', 'uploads', updatedFileName);
    
    let sharpInstance = sharp(originalFilePath);

    // Apply brightness and saturation adjustments using modulate
    sharpInstance = sharpInstance.modulate({
      brightness: brightness ? brightness / 100 : 1, // Convert brightness from 0-100 to 0-1 scale
      saturation: saturation ? saturation / 100 : 1  // Convert saturation from 0-100 to 0-1 scale
    });

    // Apply contrast adjustment using linear method
    if (contrast) {
      const contrastFactor = contrast / 100; // Normalize contrast (0-100 scale) to factor
      sharpInstance = sharpInstance.linear(contrastFactor, -(128 * (contrastFactor - 1))); // Linear contrast adjustment
    }

    // Apply rotation if present
    if (rotation) {
      sharpInstance = sharpInstance.rotate(rotation); // Rotation in degrees
    }

    // Convert image format (JPEG <-> PNG)
    const targetFormat = format || image.format;
    if (targetFormat === 'jpeg' || targetFormat === 'png') {
      sharpInstance = sharpInstance.toFormat(targetFormat);
    }

    // Save the updated image
    await sharpInstance.toFile(updatedFilePath);

    // Update image metadata in the database
    image.brightness = brightness || image.brightness;
    image.contrast = contrast || image.contrast;
    image.saturation = saturation || image.saturation;
    image.rotation = rotation || image.rotation;
    image.format = targetFormat;
    image.filename = updatedFileName; // Update filename in the database
    image.status = 'processed';

    await image.save();

    // Return the updated image details
    res.status(200).json({
      message: 'Image updated successfully',
      filename: updatedFileName,
      path: updatedFilePath, // Return path or URL to the updated image
      format: targetFormat
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Failed to update image', error: error.message });
    } else {
      res.status(500).json({ message: 'Failed to update image', error: 'An unknown error occurred' });
    }
  }
};


// 3. Download Image in Requested Format (JPEG or PNG)
const applyTransformations = (imagePath: string, brightness: number, contrast: number, saturation: number, rotation: number) => {
  let transformer = sharp(imagePath)
    .rotate(rotation)  // Apply rotation
    .modulate({
      brightness: brightness / 100,
      saturation: saturation / 100,
    });

  // Apply contrast adjustment
  if (contrast !== 100) {
    // Adjust contrast using `linear` method
    transformer = transformer.linear(contrast / 100, 0);
  }

  return transformer;
};

// Download image with applied adjustments
export const downloadImage = async (req: Request, res: Response) => {
  try {
    const { format } = req.query; // 'jpeg' or 'png'
    const imageId = req.params.id;
    const { brightness = 100, contrast = 100, saturation = 100, rotation = 0 } = req.query;

    // Ensure the format is valid
    const targetFormat = format === 'png' ? 'png' : 'jpeg';

    // Find image by ID
    const image = await Image.findById(imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Path to the original image
    const filePath = path.join(__dirname, '..', 'uploads', image.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Image file not found' });
    }

    // Apply transformations
    const transformer = applyTransformations(
      filePath,
      parseFloat(brightness as string),
      parseFloat(contrast as string),
      parseFloat(saturation as string),
      parseFloat(rotation as string)
    );

    res.setHeader('Content-Disposition', `attachment; filename="processed-image.${targetFormat}"`);
    res.type(`image/${targetFormat}`);

    // Convert and send image in the requested format
    transformer.toFormat(targetFormat).pipe(res);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Image download failed', error: error.message });
    } else {
      res.status(500).json({ message: 'Image download failed', error: 'An unknown error occurred' });
    }
  }
};

// 4. Delete Image by ID
export const deleteImage = async (req: Request, res: Response) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Image.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Failed to delete image', error: error.message });
    } else {
      res.status(500).json({ message: 'Failed to delete image', error: 'An unknown error occurred' });
    }
  }
};

// 5. Fetch All Images
export const getAllImages = async (req: Request, res: Response) => {
  try {
    const images = await Image.find();
    res.status(200).json(images);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Failed to fetch images', error: error.message });
    } else {
      res.status(500).json({ message: 'Failed to fetch images', error: 'An unknown error occurred' });
    }
  }
};

// 6. Fetch a Single Image by ID
export const getImageById = async (req: Request, res: Response) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    res.status(200).json(image);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Failed to fetch image', error: error.message });
    } else {
      res.status(500).json({ message: 'Failed to fetch image', error: 'An unknown error occurred' });
    }
  }
};
