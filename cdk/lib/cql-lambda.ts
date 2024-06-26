import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuApiLambda } from '@guardian/cdk/lib/patterns/api-lambda';
import type { App } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class CqlLambda extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		new GuApiLambda(this, 'cql-lambda', {
			app: 'cql-lambda',
			handler: 'cql.Handler::handleRequest',
			functionName: `cql-lambda-${this.stage}`,
			runtime: Runtime.JAVA_11,
			fileName: 'cql-lambda.jar',
			api: {
				id: 'query',
				description: 'Get a CAPI query string from a CQL query',
			},
			monitoringConfiguration: { noMonitoring: true },
		});
	}
}
