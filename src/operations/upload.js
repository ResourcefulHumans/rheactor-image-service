/* global Buffer */

import {Object as ObjectType, String as StringType, struct, refinement} from 'tcomb'
import {URIValue, URIValueType} from 'rheactor-value-objects'
import {HttpProblem} from 'rheactor-models'
import Promise from 'bluebird'
import v4 from 'uuid'
import gm from 'gm'
const im = gm.subClass({imageMagick: true})
const $context = new URIValue('https://github.com/ResourcefulHumans/rheactor-image-service#Upload')
const $contextResult = new URIValue('https://github.com/ResourcefulHumans/rheactor-image-service#UploadResult')
const AllowedMimeType = refinement(StringType, s => s === 'image/jpeg' || s === 'image/png', 'AllowedMimeType')

/**
 * @param {S3} s3
 * @param {String} bucket
 * @param {URIValue} webLocation
 * @param {Object} body
 * @param {Array} parts
 * @param {JsonWebToken|undefined} token
 * @returns {Promise}
 */
const upload = (s3, bucket, webLocation, body, parts, token) => {
  return Promise
    .try(() => {
      UploadJSONType(body)
      const ext = body.mimeType === 'image/png' ? 'png' : 'jpg'
      let filename = null
      if (isNaN(token.sub)) {
        const sub = new URIValue(token.sub) // we expect token.sub to be an URI
        const host = sub.toString().match(/^https?:\/\/([^/]+)/)[1].replace(/[^a-z0-9]/ig, '-') // group images by host
        const identifier = sub.toString().match(/^https?:\/\/[^/]+\/(.+)/)[1].replace(/[^a-z0-9]/ig, '-') // take the path part and add it as an identifier
        filename = `${host}/${v4()}-${identifier}.${ext}`
      } else {
        filename = `shared/${v4()}-${token.sub}.${ext}`
      }

      const imageData = Buffer.from(body.image, 'base64')

      return thumbnail(imageData, filename)
        .then(resized => Promise
          .promisify(s3.putObject, {context: s3})({
            Bucket: bucket,
            Key: filename,
            Body: resized,
            ContentType: body.mimeType
          })
        )
        .then(() => ({
          $context: $contextResult.toString(),
          url: webLocation.slashless().append(`/${filename}`).toString(),
          mimeType: body.mimeType
        }))
    })
    .catch(/TypeError/, err => {
      throw new HttpProblem(
        new URIValue('https://github.com/ResourcefulHumans/rheactor-image-service#ValidationFailed'),
        err.toString(),
        400
      )
    })
}

export const uploadOperation = (s3, bucket, webLocation) => {
  ObjectType(s3, ['uploadOperation()', 's3:Object'])
  StringType(bucket, ['uploadOperation()', 'bucket:String'])
  URIValueType(webLocation, ['uploadOperation()', 'webLocation:URIValue'])
  return {
    post: upload.bind(null, s3, bucket, webLocation)
  }
}

export class Upload {
  /**
   * @returns {URIValue}
   */
  static get $context () {
    return $context
  }
}

export const UploadJSONType = struct({
  $context: refinement(StringType, s => s === $context.toString(), 'UploadContext'),
  image: StringType,
  mimeType: AllowedMimeType
}, 'UploadJSONType')

/**
 * @param {Buffer} imageData
 * @param {String} filename
 * @return {Promise.<Buffer>}
 */
export const thumbnail = (imageData, filename) => {
  StringType(filename)
  return new Promise((resolve, reject) => {
    const image = im(imageData, filename)
    image.size((err, size) => {
      const landscape = size.width > size.height
      const minLen = Math.min(size.width, size.height)
      let cutX = 0
      let cutY = 0
      if (landscape) {
        cutX = (size.width - size.height) / 2
      } else {
        cutY = (size.height - size.width) / 2
      }
      if (err) return reject(err)
      image
        .crop(minLen, minLen, cutX, cutY)
        .resize(256, 256)
        .noProfile()
        .autoOrient()
        .toBuffer('JPEG', (err, buffer) => {
          if (err) return reject(err)
          return resolve(buffer)
        })
    })
  })
}
