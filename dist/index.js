"use strict";
const fs = require("fs");
const path = require("path");
const uuid = require("uuid");
const firestore_1 = require("firebase-admin/firestore");
function fileExist(file) {
    try {
        fs.statSync(file);
        return true;
    }
    catch (err) {
        return false;
    }
}
/**
 * Upload the specified file to the destination.
 *
 * @param {string} file the local path of the file
 * @param {string} destination the remote path of the file
 * @param {boolean} force if true, upload even if the file exists
 * @return {Promise.<string>} download url for the file
 */
function uploadFile(bucket, file, destination, force) {
    if (destination.startsWith("/")) {
        destination = destination.substring(1);
    }
    // check if the file exists locally.
    if (!fileExist(file)) {
        return new Promise((resolve, reject) => {
            reject(new Error("file not found: " + file));
        });
    }
    return new Promise((resolve, reject) => {
        // check whether the file exists or not
        bucket.file(destination).exists().then(exist => {
            resolve(exist[0]);
        }).catch(e => {
            reject(e);
        });
    }).then(exist => {
        // upload file
        return new Promise((resolve, reject) => {
            if (exist == false || force) {
                bucket.upload(file, { destination: destination }).then(r => {
                    resolve(null);
                }).catch(e => {
                    reject(e);
                });
            }
            else {
                resolve(null);
            }
        });
    }).then(() => {
        // get metadata
        return new Promise((resolve, reject) => {
            bucket.file(destination).getMetadata().then((metadata) => {
                resolve(metadata[0]);
            }).catch(e => {
                reject(e);
            });
        });
    }).then((metadata) => {
        // update "firebaseStorageDownloadTokens" metadata
        return new Promise((resolve, reject) => {
            var token;
            if (metadata && metadata["firebaseStorageDownloadTokens"]) {
                token = metadata["firebaseStorageDownloadTokens"];
                resolve(token);
            }
            else {
                token = uuid.v4();
                metadata = metadata || {};
                metadata["firebaseStorageDownloadTokens"] = token;
                bucket.file(destination).setMetadata(metadata).then(() => {
                    resolve(token);
                }).catch(r => {
                    reject(r);
                });
            }
        });
    }).then((token) => {
        // generate download url
        //var url = "https://firebasestorage.googleapis.com/v0/b/fuzoroinomori-4b4d1.appspot.com/o/public%2Fitems%2F59qsMV4SzaACDNT2Kx85.jpg?alt=media&token=7f4f487a-c24c-4d70-b5ab-f01ddf34cf75"
        var url = "https://firebasestorage.googleapis.com/v0/b/"
            + bucket.name
            + "/o/"
            + encodeURIComponent(destination)
            + "?alt=media&token="
            + token;
        return new Promise((resolve, reject) => {
            resolve(url);
        });
    });
}
class ImageSeed {
    constructor(localPath, remotePath, imageOptions) {
        this.localPath = localPath;
        this.remotePath = remotePath;
        this.localPath = localPath;
        this.remotePath = remotePath;
        this.downloadURL = null;
        if (imageOptions != null) {
            this.localPath = path.join(imageOptions.localDir, localPath);
            this.remotePath = path.join(imageOptions.remoteDir, remotePath);
        }
    }
    upload(bucket, docId) {
        return new Promise((resolve, reject) => {
            if (this.downloadURL != null) {
                resolve(this.downloadURL);
                return;
            }
            var fixedLocalPath = this.localPath.replace(/\{id\}/, docId);
            var fixedRemotePath = this.remotePath.replace(/\{id\}/, docId);
            if (!fileExist(fixedLocalPath)) {
                reject(new Error("file not found: " + fixedLocalPath));
                return;
            }
            uploadFile(bucket, fixedLocalPath, fixedRemotePath).then(url => {
                this.downloadURL = url;
                resolve(this.downloadURL);
            }).catch(e => {
                reject(e);
            });
        });
    }
}
class GeoPointSeed {
    constructor(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
}
class DocumentSeed {
    constructor(id, data) {
        this.id = id;
        this.data = data;
    }
}
class DocumentRefSeed {
    constructor(collection, document) {
        this.collection = collection;
        this.document = document;
    }
}
class SubcollectionSeed {
    constructor(docs) {
        this.docs = docs;
    }
}
const DELETE = "__delete__";
class Context {
    constructor(doc, docRef) {
        this.doc = doc;
        this.docRef = docRef;
        this.postDocActions = [];
    }
}
class CollectionSeed {
    constructor(docs, collectionProvider) {
        this.docs = docs;
        this.collectionProvider = collectionProvider;
    }
    getCollection(firestore) {
        return this.collectionProvider(firestore);
    }
    importDocuments(admin) {
        const self = this;
        const firestore = admin.firestore();
        function filterDocument(context) {
            function filterObject(context, key, o) {
                let parentDocID = context.doc.id;
                var p = [];
                var filteredObject = o;
                if (o instanceof ImageSeed) {
                    var bucket = admin.storage().bucket();
                    p.push(o.upload(bucket, parentDocID).then(url => {
                        filteredObject = url;
                    }));
                }
                else if (o instanceof DocumentRefSeed) {
                    filteredObject = firestore.collection(o.collection).doc(o.document);
                }
                else if (o instanceof SubcollectionSeed) {
                    const subcollectionRef = self.getCollection(firestore).doc(context.doc.id).collection(key);
                    const subcollection = new CollectionSeed(o.docs, () => subcollectionRef);
                    filteredObject = DELETE;
                    context.postDocActions.push(() => subcollection.importDocuments(admin));
                }
                else if (o instanceof GeoPointSeed) {
                    filteredObject = new firestore_1.GeoPoint(o.latitude, o.longitude);
                }
                else if (o instanceof Date) {
                    filteredObject = firestore_1.Timestamp.fromDate(o);
                }
                else if (o instanceof firestore_1.Timestamp) {
                    filteredObject = o;
                }
                else if (o instanceof Array || o instanceof Object) {
                    filteredObject = o instanceof Array ? Array(o.length) : {};
                    for (let i in o) {
                        p.push(filterObject(context, i, o[i]).then(filteredChild => {
                            if (filteredChild !== DELETE) {
                                filteredObject[i] = filteredChild;
                            }
                        }));
                    }
                }
                return Promise.all(p).then(() => {
                    return new Promise((resolve, reject) => {
                        resolve(filteredObject);
                    });
                });
            }
            return new Promise((resolve, reject) => {
                let doc = context.doc;
                let id = doc.id;
                return filterObject(context, null, doc.data).then(filteredData => {
                    resolve(new DocumentSeed(id, filteredData));
                }).catch(e => {
                    reject(e);
                });
            });
        }
        const p = [];
        let collection = this.getCollection(firestore);
        this.docs.forEach(d => {
            let docRef = collection.doc(d.id);
            let context = new Context(d, docRef);
            p.push(filterDocument(context).then(filteredDoc => {
                return docRef.set(filteredDoc.data).then(() => {
                    let postDocResults = [];
                    context.postDocActions.forEach(postDocAction => {
                        postDocResults.push(postDocAction());
                    });
                    return Promise.all(postDocResults);
                });
            }));
        });
        return Promise.all(p);
    }
}
module.exports = {
    /**
     * Create document.
     *
     * @param id document id.
     * @param data document data.
     */
    doc(id, data) {
        return new DocumentSeed(id, data);
    },
    /**
     * Create document reference.
     *
     * @param collection collection path
     * @param document document id.  if omitted, the last path component of the '/' separated path will be used.
     */
    docRef(collection, document) {
        if (document === undefined || document === null) {
            let s = collection.split("/");
            if (s.length != 2) {
                throw new Error("unsupported format collection: " + collection);
            }
            collection = s[0];
            document = s[1];
        }
        return new DocumentRefSeed(collection, document);
    },
    /**
     * Create image.  The image file will be upload to Cloud Storage.
     *
     * @param localPath file to upload.  relative path from {@link ImageOptions#localDir}.
     * @param remotePath upload path on CloudStorage. relative path from {@link ImageOptions#remoteDir}
     * @param imageOptions options
     */
    image(localPath, remotePath, imageOptions) {
        return new ImageSeed(localPath, remotePath, imageOptions);
    },
    /**
     * for compatibility.
     *
     * You don't need to use this method.
     * You can simply pass plain javascript object to image() method.
     */
    imageOptions(localDir, remoteDir) {
        return { localDir, remoteDir };
    },
    geoPoint(latitude, longitude) {
        return new GeoPointSeed(latitude, longitude);
    },
    collection(name, docs) {
        return new CollectionSeed(docs, (firestore) => firestore.collection(name));
    },
    subcollection(docs) {
        return new SubcollectionSeed(docs);
    },
    importCollections(admin, collections) {
        return Promise.all(collections.map(collection => collection.importDocuments(admin)));
    }
};
