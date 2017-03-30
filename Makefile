.DEFAULT_GOAL := help
.PHONY: help deploy update-lambda-function update-lambda-env update-env-vars delete clean update test test-prepare

AWS_REGION ?= "eu-central-1"
AWS_FUNCTION_NAME ?= "rheactor-image-service"
NODE_ENV ?= "production"
VERSION ?= $(shell /usr/bin/env node -e "console.log(require('./package.json').version);")

archive.zip: src/*.js src/**/*.js package.json
	rm -f $@
	rm -rf build
	./node_modules/.bin/babel src -d build
	cp package.json build
	cd build; npm install --production > /dev/null
	cd build; zip -r -q ../$@ ./

deploy: archive.zip guard-AWS_ROLE  ## Deploy to AWS lambda
	aws lambda create-function \
	--region $(AWS_REGION) \
	--function-name $(AWS_FUNCTION_NAME) \
	--zip-file fileb://$< \
	--role $(AWS_ROLE) \
	--timeout 60 \
	--handler index.handler \
	--runtime nodejs4.3

update-lambda-function: archive.zip guard-AWS_REGION guard-AWS_FUNCTION_NAME ## Update the lambda function with new build
	aws lambda update-function-code \
	--region $(AWS_REGION) \
	--function-name $(AWS_FUNCTION_NAME) \
	--zip-file fileb://$<

update-lambda-env: guard-NODE_ENV guard-VERSION ## Update the lambda environment with version from environment variable and current time for deploy time
	aws lambda update-function-configuration \
	--function-name $(AWS_FUNCTION_NAME) \
	--region $(AWS_REGION) \
	--environment "Variables={$(shell make -s update-env-vars)}"

update-env-vars: guard-NODE_ENV guard-VERSION
	@aws lambda get-function-configuration \
	--function-name $(AWS_FUNCTION_NAME) \
	--region $(AWS_REGION) \
	| ./node_modules/.bin/babel-node ./node_modules/.bin/update-lambda-environment-config

delete: ## Deploy from AWS lambda
	aws lambda delete-function --region $(AWS_REGION) --function-name $(AWS_FUNCTION_NAME)

TRAVIS_REPO_SLUG ?= "ResourcefulHumans/rheactor-image-service"

update: guard-NODE_ENV ## Update the lambda
ifeq "${VERSION}" "0.0.0-development"
	@echo "Not deploying $(VERSION)!"
else
	make update-lambda-function
	NODE_ENV=$(NODE_ENV) VERSION=$(VERSION) make update-lambda-env
	@if [ "${SLACK_DEPLOY_WEBHOOK}" != "" ]; then \
		curl -X POST --data-urlencode 'payload={"text": "version *${VERSION}* of <https://github.com/${TRAVIS_REPO_SLUG}|${TRAVIS_REPO_SLUG}> has been deployed."}' ${SLACK_DEPLOY_WEBHOOK}; \
	fi
endif

# Tests

S3_BUCKET ?= rheactor-image-service
S3_CFG := /tmp/.s3cfg-$(S3_BUCKET)
HOSTNAME := $(shell hostname)

test-prepare:
	# Create s3cmd config
	@echo $(S3_CFG)
	@echo "[default]" > $(S3_CFG)
	@echo "access_key = $(AWS_ACCESS_KEY_ID)" >> $(S3_CFG)
	@echo "secret_key = $(AWS_SECRET_ACCESS_KEY)" >> $(S3_CFG)
	@echo "bucket_location = $(AWS_REGION)" >> $(S3_CFG)

	s3cmd -c $(S3_CFG) put -P -M --no-mime-magic ./test/data/public.key s3://$(S3_BUCKET)/$(HOSTNAME)-test.key

test: test-prepare ## Prepare and run the tests
	npm run test:coverage-travis

# Helpers

guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

clean: ## Clear up build artefacts
	rm -rf build
	rm archive.zip
