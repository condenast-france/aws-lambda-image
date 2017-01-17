/**
 * Automatic Image resize, reduce with AWS Lambda
 * Lambda main handler
 *
 * @author Yoshiaki Sugimoto
 * @created 2015/10/29
 */
"use strict";

const ImageProcessor = require("./libs/ImageProcessor");
const Config         = require("./libs/Config");
const fs             = require("fs");
const path           = require("path");


// Lambda Handler
exports.handler = (event, context, callback) => {
    let mode     = event.mode || null;
    let ImageObject;

    if( mode === "upload"){
        ImageObject = {name:"image."+event.contentType.split('/').pop(), data: event.data, type:event.contentType};
    } else {
        ImageObject   = event.Records[0].s3;
        mode = null;
    }
    const configPath = path.resolve(__dirname, "config.json");
    const processor  = new ImageProcessor(ImageObject,mode);
    const config     = new Config(
        JSON.parse(fs.readFileSync(configPath, { encoding: "utf8" }))
    );

    processor.run(config,mode)
    .then((processedImages) => {
        if(mode === "upload") {
            callback(null, processedImages.data.toString('base64'));
        }
        var message = "OK, " + processedImages + " images were processed.";
        context.succeed(message);
    })
    .catch((messages) => {
        if ( messages === "Object was already processed." ) {
            console.log("Image already processed");
            context.succeed("Image already processed");
        } else {
            if(mode === "upload") {
                let response = {
                    status: 400,
                    errors: [
                        {
                            code: "500",
                            message: "Error processing " + ImageObject.object.key + ": " + messages,
                        }
                    ]
                };
                context.fail(JSON.stringify(response));
            } else {
                context.fail("Error processing " + ImageObject.object.key + ": " + messages);
            }
        }
    });

};


