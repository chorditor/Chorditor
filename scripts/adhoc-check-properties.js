const path = require('path');
const { BigQuery } = require('@google-cloud/bigquery');
const bq = new BigQuery({ projectId: 'chorditor-50f9f', keyFilename: path.join(__dirname, '..', 'gcp-service-account.json') });

const query = `
SELECT event_name, properties
FROM \`chorditor-50f9f.chorditor_analytics.analytics_events\`
WHERE event_name IN ('quiz_completed', 'scale_test_result', 'combo_training_completed')
LIMIT 3
`;

bq.query({ query }).then(([rows]) => rows.forEach(r => console.log(r.event_name, '=>', r.properties))).catch(e => console.error(e.message));
