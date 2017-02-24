# rheactor-image-service
  
[![npm version](https://img.shields.io/npm/v/@resourcefulhumans/rheactor-image-service.svg)](https://www.npmjs.com/package/@resourcefulhumans/rheactor-image-service)
[![Build Status](https://travis-ci.org/ResourcefulHumans/rheactor-image-service.svg?branch=master)](https://travis-ci.org/ResourcefulHumans/rheactor-image-service)
[![monitored by greenkeeper.io](https://img.shields.io/badge/greenkeeper.io-monitored-brightgreen.svg)](http://greenkeeper.io/) 
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![semantic-release](https://img.shields.io/badge/semver-semantic%20release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Test Coverage](https://codeclimate.com/github/ResourcefulHumans/rheactor-image-service/badges/coverage.svg)](https://codeclimate.com/github/ResourcefulHumans/rheactor-image-service/coverage)
[![Code Climate](https://codeclimate.com/github/ResourcefulHumans/rheactor-image-service/badges/gpa.svg)](https://codeclimate.com/github/ResourcefulHumans/rheactor-image-service)

An image processing backend running on AWS Lambda.

Uses [gm](https://www.npmjs.com/package/gm) with GraphicsMagick (which is available by default)
on AWS lambda.

It takes JPEG or PNG images that are uploaded base64 encoded, resizes them on the fly to
256x256px size, and stores them on an S3 bucket.

## Request

Users need to provide an [JsonWebToken](https://jwt.io/) which is checked against the configured public key.

    POST /upload
    Content-Type: application/vnd.resourceful-humans.rheactor-image-service.v1+json
    Authorization: Bearer <token>
    
    {
      "$context":"https://github.com/ResourcefulHumans/rheactor-image-service#Upload",
      "image":"R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "mimeType":"image/png"
    }

## Response

    Content-Type: application/vnd.resourceful-humans.rheactor-image-service.v1+json
    
    {
      "$context":"https://github.com/ResourcefulHumans/rheactor-image-service#UploadResult",
      "url":"https://s3.eu-central-1.amazonaws.com/rheactor-image-service/example.com/33f24f55-e435-4198-a148-fdd1095ffa96-user-5.jpg",
      "mimeType":"image/jpeg"
    }

This implementation expects token's `sub` to be an URL, which will be used to prefix and suffix URLs. 
A `sub` value of `https://example.com/user/5` was used in the example above.

## Configuration

These environment variables need to be set on the lambda function:

 - `S3_BUCKET`  
   Name of the S3 bucket, e.g. `rheactor-image-service` to where files are uploaded.
 - `S3_REGION`  
   Region to use.
 - `MOUNT_URL`  
   Public endpoint for the lamba function (as provided by API Gateway)
 - `WEB_LOCATION`  
   Public URL for the bucket
 - `PUBLIC_KEY`  
   Public key to be used for verifying tokens

## Setup

    npm install
    
    # Configure these environment variables
    AWS_ROLE=…
    AWS_ACCESS_KEY_ID=…
    AWS_SECRET_ACCESS_KEY=…
    AWS_REGION=…
    AWS_FUNCTION_NAME=…
    NODE_ENV=…
    VERSION=…
    
    # install this as a new lambda function
    make install
