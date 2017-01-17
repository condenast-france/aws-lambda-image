"use strict";

const ImageData         = require("./ImageData");
const Mozjpeg           = require("./optimizers/Mozjpeg");
const Pngquant          = require("./optimizers/Pngquant");
const Pngout            = require("./optimizers/Pngout");
const Gifsicle          = require("./optimizers/Gifsicle");
const ReadableStream    = require("./ReadableImageStream");
const StreamChain       = require("./StreamChain");
const imageMin          = require('imagemin');
const imageMinMozjpeg   = require('imagemin-mozjpeg');
const imageMinPngquant  = require('imagemin-pngquant');
const imageMinPngout    = require('imagemin-pngout');
const imageMinGifsicle  = require('imagemin-gifsicle');
const imageminJpegtran  = require('imagemin-jpegtran');
// const JpegOptim    = require("./optimizers/JpegOptim");

class ImageReducer {

    /**
     * Image Reducer
     * Accept png/jpeg typed image
     *
     * @constructor
     * @param Object option
     */
    constructor(option,mode) {
        this.option = option || {};
        this.mode = mode || null;
    }

    /**
     * Execute process
     *
     * @public
     * @param ImageData image
     * @return Promise
     */
    exec(image) {
        const option = this.option;
        let type;
        const input   = new ReadableStream(image.data);
        if( this.mode === "upload") {
            type = image.type.split('/').pop();
        } else {
            type = image.type;
        }
        //const streams = this.createReduceProcessList(type.toLowerCase());
        const optimizers = [];
        switch ( type ) {
            case "png":
                optimizers.push(imageMinPngquant({quality: this.option.quality}));
                optimizers.push(imageMinPngout({strategy: 1}));
                break;
            case "jpg":
            case "jpeg":
                //optimizers.push(imageMinMozjpeg(this.option.quality));
                optimizers.push(imageminJpegtran());
                break;
            case "gif":
                optimizers.push(imageMinGifsicle());
                break;
            default:
                throw new Error("Unexcepted file type.");
        }
        return imageMin.buffer(image.data, { use: optimizers })
            .then((buffer) => {
                return new ImageData(
                    image.combineWithDirectory(option.directory, option.prefix),
                    option.bucket || image.bucketName,
                    buffer,
                    image.headers,
                    option.acl
                );
            });
    }

    /**
     * Create reduce image process list
     *
     * @protected
     * @param String type
     * @return Array<Optimizer>
     * @thorws Error
     */
    createReduceProcessList(type) {
        console.log("Reducing to: " + (this.option.directory || "in-place"));

        const streams = [];

        switch ( type ) {
            case "png":
                streams.push(new Pngquant());
                //streams.push(new Pngout());
                break;
            case "jpg":
            case "jpeg":
                streams.push(new Mozjpeg(this.option.quality));
                imagemin(['images/*.jpg'], 'build/images', {use: [imageminMozjpeg()]}).then(() => {
                    console.log('Images optimized');
                });
                // switch JPEG optimizer
                // if ( this.option.jpegOptimizer === "jpegoptim" ) { // using jpegoptim
                //     streams.push(new JpegOptim());
                // } else {                                           // using mozjpeg
                // }
                break;
            case "gif":
                streams.push(new Gifsicle());
                break;
            default:
                throw new Error("Unexcepted file type.");
        }

        return streams;
    }
}

module.exports = ImageReducer;
