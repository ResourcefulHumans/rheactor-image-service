/* global describe, it */

import {expect} from 'chai'
import {handler} from '../src'
const contentType = 'application/vnd.resourceful-humans.rheactor-image-service.v1+json'
const headers = {'Content-type': contentType}
import {Index, Status} from 'rheactor-models'

describe('handler', () => {
  describe('/index', () => {
    it('should return the list of operations', done => {
      handler({
        httpMethod: 'GET',
        headers,
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
        headers,
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
})

