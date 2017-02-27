/* global process */

import {handler as awsLambdaHandler, apiIndexOperation, statusOperation} from '@resourcefulhumans/rheactor-aws-lambda'
import {uploadOperation, Upload} from './operations/upload'
import {Status, Link, Index} from 'rheactor-models'
import {URIValue} from 'rheactor-value-objects'
import AWS from 'aws-sdk'
import Promise from 'bluebird'

const mountURL = new URIValue(process.env.MOUNT_URL)
const contentType = 'application/vnd.resourceful-humans.rheactor-image-service.v1+json'
const version = process.env.VERSION
const environment = process.env.NODE_ENV
const deployTime = process.env.DEPLOY_TIME
const bucket = process.env.S3_BUCKET
const publicKeyFile = process.env.PUBLIC_KEY_FILE

const s3 = new AWS.S3({
  region: process.env.S3_REGION,
  signatureVersion: 'v4'
})

// Loads the public key from S3
const pubKeyPromise = new Promise((resolve, reject) => {
  s3.getObject({
    Bucket: bucket,
    Key: publicKeyFile
  }, (err, data) => {
    if (err) return reject(err)
    return resolve(data.Body.toString())
  })
})

const operations = {
  index: apiIndexOperation(new Index([
    new Link(mountURL.slashless().append('/status'), Status.$context),
    new Link(mountURL.slashless().append('/upload'), Upload.$context)
  ])),
  upload: uploadOperation(s3, bucket, new URIValue(process.env.WEB_LOCATION)),
  status: statusOperation(version, environment, deployTime)
}

export const handler = (event, context, callback) => {
  pubKeyPromise.then(publicKey => {
    awsLambdaHandler(contentType, environment, publicKey, operations, event, context, callback)
  })
}
