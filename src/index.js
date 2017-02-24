/* global process */

import {handler as awsLambdaHandler, apiIndexOperation, statusOperation} from '@resourcefulhumans/rheactor-aws-lambda'
import {uploadOperation, Upload} from './operations/upload'
import {Status, Link, Index} from 'rheactor-models'
import {URIValue} from 'rheactor-value-objects'
import AWS from 'aws-sdk'

const mountURL = new URIValue(process.env.MOUNT_URL)
const contentType = 'application/vnd.resourceful-humans.rheactor-image-service.v1+json'
const version = process.env.VERSION
const environment = process.env.NODE_ENV
const deployTime = process.env.DEPLOY_TIME
// TODO: Load the key public from S3
const keyType = environment === 'testing' ? 'PUBLIC KEY' : 'RSA PUBLIC KEY'
const publicKey = `-----BEGIN ${keyType}-----\n${process.env.PUBLIC_KEY.match(/.{1,64}/g).join('\n')}\n-----END ${keyType}-----`

const s3 = new AWS.S3({
  region: process.env.S3_REGION,
  signatureVersion: 'v4'
})

const operations = {
  index: apiIndexOperation(new Index([
    new Link(mountURL.slashless().append('/status'), Status.$context),
    new Link(mountURL.slashless().append('/upload'), Upload.$context)
  ])),
  upload: uploadOperation(s3, process.env.S3_BUCKET, new URIValue(process.env.WEB_LOCATION)),
  status: statusOperation(version, environment, deployTime)
}

export const handler = awsLambdaHandler.bind(undefined, contentType, environment, publicKey, operations)
