const fetch = require('node-fetch');

const payload = {
  id_user: 1,
  items: [
    { id_item: 1, is_present: 1, comments: "test" }
  ]
};

fetch('http://localhost:3000/api/reports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
