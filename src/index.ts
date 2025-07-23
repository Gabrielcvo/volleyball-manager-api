import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

// Rota de saúde com tipos definidos
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ status: "API rodando com sucesso!" });
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
  console.log("API disponível em http://localhost:3000/");
});
