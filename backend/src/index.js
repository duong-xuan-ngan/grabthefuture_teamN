require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// TODO (BE Dev 1): mount route files here
// app.use('/api/v1/reports',   require('./routes/reports'));
// app.use('/api/v1/routes',    require('./routes/routes'));
// app.use('/api/v1/dashboard', require('./routes/dashboard'));
// app.use('/api/v1/auth',      require('./routes/auth'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// TODO (BE Dev 1): add global error handler middleware here

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`WasteFlow API running on port ${PORT}`));

module.exports = app;
