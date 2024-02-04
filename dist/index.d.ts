import * as admin from 'firebase-admin';
import { Bucket } from '@google-cloud/storage';
import { Firestore } from 'firebase-admin/firestore';
declare class ImageSeed {
    private localPath;
    private remotePath;
    private downloadURL;
    constructor(localPath: string, remotePath: string, imageOptions: ImageOptions);
    upload(bucket: Bucket, docId: string): Promise<unknown>;
}
interface ImageOptions {
    localDir: string;
    remoteDir: string;
}
declare class GeoPointSeed {
    latitude: number;
    longitude: number;
    constructor(latitude: number, longitude: number);
}
declare class DocumentSeed {
    id: string;
    data: any;
    constructor(id: string, data: any);
}
declare class DocumentRefSeed {
    collection: string;
    document: string;
    constructor(collection: string, document: string);
}
declare class SubcollectionSeed {
    docs: DocumentSeed[];
    constructor(docs: DocumentSeed[]);
}
interface AdminLike {
    firestore(): Firestore;
    storage(): StorageLike;
}
interface StorageLike {
    bucket(): Bucket;
}
declare class CollectionSeed {
    docs: DocumentSeed[];
    private collectionProvider;
    constructor(docs: DocumentSeed[], collectionProvider: (firestore: Firestore) => admin.firestore.CollectionReference);
    private getCollection;
    importDocuments(admin: AdminLike): Promise<any[]>;
}
declare const _default: {
    /**
     * Create document.
     *
     * @param id document id.
     * @param data document data.
     */
    doc(id: string, data: any): DocumentSeed;
    /**
     * Create document reference.
     *
     * @param collection collection path
     * @param document document id.  if omitted, the last path component of the '/' separated path will be used.
     */
    docRef(collection: string, document?: string | null): DocumentRefSeed;
    /**
     * Create image.  The image file will be upload to Cloud Storage.
     *
     * @param localPath file to upload.  relative path from {@link ImageOptions#localDir}.
     * @param remotePath upload path on CloudStorage. relative path from {@link ImageOptions#remoteDir}
     * @param imageOptions options
     */
    image(localPath: string, remotePath: string, imageOptions: ImageOptions): ImageSeed;
    /**
     * for compatibility.
     *
     * You don't need to use this method.
     * You can simply pass plain javascript object to image() method.
     */
    imageOptions(localDir: string, remoteDir: string): ImageOptions;
    geoPoint(latitude: number, longitude: number): GeoPointSeed;
    collection(name: string, docs: DocumentSeed[]): CollectionSeed;
    subcollection(docs: DocumentSeed[]): SubcollectionSeed;
    importCollections(admin: any, collections: CollectionSeed[]): Promise<any[][]>;
};
export = _default;
//# sourceMappingURL=index.d.ts.map