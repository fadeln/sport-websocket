import express from 'express';
import { matchRouter } from './routes/matches';

const app = express();
const port = 8000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from the Express server!');
});

app.use('/matches', matchRouter)

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
