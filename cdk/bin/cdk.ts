import 'source-map-support/register';
import { GuRoot } from '@guardian/cdk/lib/constructs/root';
import { CqlLambda } from '../lib/cql-lambda';

const app = new GuRoot();

new CqlLambda(app, 'CqlLambda-PROD', {
	stack: 'playground',
	stage: 'PROD',
	env: { region: 'eu-west-1' },
});
