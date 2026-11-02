const env = require('./config/env');
const app = require('./app');

app.listen(env.PORT, () => {
  console.log(`Server berjalan di http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
