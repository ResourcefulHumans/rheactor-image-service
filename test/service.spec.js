/* global Buffer, describe, it */

import {expect} from 'chai'
import {handler} from '../src'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import {Index, Status} from 'rheactor-models'
const contentType = 'application/vnd.resourceful-humans.rheactor-image-service.v1+json'

describe('service', () => {
  describe('/index', () => {
    it('should return the list of operations', done => {
      handler({
        httpMethod: 'GET',
        headers: {
          'Content-Type': contentType
        },
        path: '/index'
      }, null, (err, res) => {
        expect(err).to.equal(null)
        expect(res.statusCode).to.equal(200)
        expect(res.headers['Content-Type']).to.equal(contentType)
        const index = Index.fromJSON(JSON.parse(res.body))
        expect(index.$links.length, 'Index should have 2 links').to.equal(2)
        expect(index.$links.filter(({subject}) => subject.equals(Status.$context)).length, 'Index should link to Status').to.equal(1)
        done()
      })
    })
  })

  describe('/status', () => {
    it('should return the status', done => {
      handler({
        httpMethod: 'POST',
        headers: {
          'Content-Type': contentType
        },
        path: '/status'
      }, null, (err, res) => {
        expect(err).to.equal(null)
        expect(res.statusCode).to.equal(200)
        expect(res.headers['Content-Type']).to.equal(contentType)
        const status = Status.fromJSON(JSON.parse(res.body))
        expect(status.status).to.equal('ok')
        expect(status.version).to.match(/^0\.0\.0\+testing\.[0-9]+$/)
        done()
      })
    })
  })

  describe('/upload', () => {
    it('should scale and upload a JPEG image', done => {
      const imageData = new Buffer(fs.readFileSync('./test/data/d4d4d4.jpg')).toString('base64')
      const privateKey = fs.readFileSync('./test/data/private.key', 'utf-8')
      const token = jwt.sign({}, privateKey, {algorithm: 'RS256', subject: 'https://example.com/user/5', expiresIn: 60 * 60})

      const event = {
        body: `{"$context":"https://github.com/ResourcefulHumans/rheactor-image-service#Upload","image":"${imageData}","mimeType":"image/jpeg"}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType
        },
        httpMethod: 'POST',
        path: '/upload'
      }

      handler(event, undefined, (err, response) => {
        expect(err).to.equal(null)
        expect(response.statusCode).to.equal(200)
        expect(response.headers['Content-Type']).to.equal(contentType)
        const b = JSON.parse(response.body)
        expect(b.$context).to.equal('https://github.com/ResourcefulHumans/rheactor-image-service#UploadResult')
        expect(b.url).to.match(/^http:\/\/images\.example\.com\/example-com\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-user-5.jpg/)
        expect(b.mimeType).to.equal('image/jpeg')
        done()
      })
    })

    it('should return error on wrong input', done => {
      const event = {
        body: '{}',
        headers: {
          'Content-Type': contentType
        },
        httpMethod: 'POST',
        path: '/upload'
      }
      handler(event, undefined, (err, response) => {
        expect(err).to.equal(null)
        expect(response.statusCode).to.equal(400)
        done()
      })
    })
  })
})
