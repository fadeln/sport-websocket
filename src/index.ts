import express, { Request, Response } from 'express';

const app = express();
const port = 8000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Server is running!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
