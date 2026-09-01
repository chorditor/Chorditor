const path = require('path');
const { BigQuery } = require('@google-cloud/bigquery');
const bq = new BigQuery({ projectId: 'chorditor-50f9f', keyFilename: path.join(__dirname, '..', 'gcp-service-account.json') });

const query = `
SELECT event_name, COUNT(*) n, COUNT(DISTINCT user_id) users,
  MIN(created_at) first_seen, MAX(created_at) last_seen
FROM \`chorditor-50f9f.chorditor_analytics.analytics_events\`
WHERE event_name IN ('progression_played','progression_page_viewed','progression_detail_viewed','progression_detail_played','progression_key_changed','progression_detail_entered')
GROUP BY event_name ORDER BY n DESC
`;

bq.query({ query }).then(([rows]) => console.table(rows)).catch((e) => console.error(e.message));
