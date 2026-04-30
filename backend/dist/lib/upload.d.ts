import multer from "multer";
export declare const uploadMascotImage: multer.Multer;
export declare const uploadVideo: multer.Multer;
/** Удалить файл из uploads (safe, не бросает ошибку) */
export declare function removeUploadedFile(relativePath: string): void;
/** Превратить filename в относительный URL для API */
export declare function mascotUrl(filename: string): string;
export declare function videoUploadUrl(filename: string): string;
//# sourceMappingURL=upload.d.ts.map