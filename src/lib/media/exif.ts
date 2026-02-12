import exifr from 'exifr';

export interface ExifData {
  capturedAt: Date | null;
  width: number | null;
  height: number | null;
  make: string | null;
  model: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
}

export async function extractExif(filePath: string): Promise<ExifData> {
  try {
    const data = await exifr.parse(filePath, {
      pick: [
        'DateTimeOriginal',
        'CreateDate',
        'ModifyDate',
        'ImageWidth',
        'ImageHeight',
        'ExifImageWidth',
        'ExifImageHeight',
        'Make',
        'Model',
        'GPSLatitude',
        'GPSLongitude',
      ],
    });

    if (!data) {
      return {
        capturedAt: null,
        width: null,
        height: null,
        make: null,
        model: null,
        gpsLatitude: null,
        gpsLongitude: null,
      };
    }

    const capturedAt = data.DateTimeOriginal || data.CreateDate || data.ModifyDate || null;

    return {
      capturedAt: capturedAt ? new Date(capturedAt) : null,
      width: data.ExifImageWidth || data.ImageWidth || null,
      height: data.ExifImageHeight || data.ImageHeight || null,
      make: data.Make || null,
      model: data.Model || null,
      gpsLatitude: data.GPSLatitude || null,
      gpsLongitude: data.GPSLongitude || null,
    };
  } catch {
    return {
      capturedAt: null,
      width: null,
      height: null,
      make: null,
      model: null,
      gpsLatitude: null,
      gpsLongitude: null,
    };
  }
}
