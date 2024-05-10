import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class CqlLambda extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		new GuLambdaFunction(this, 'cql-lambda', {
			app: 'cql-lambda',
			handler: 'cql.Handler::handleRequest',
			functionName: `cql-lambda-${this.stage}`,
      runtime: Runtime.JAVA_11,
      fileName: "cql-lambda.jar"
		});
	}
}
