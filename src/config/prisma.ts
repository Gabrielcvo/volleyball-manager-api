import { PrismaClient } from "@prisma/client";

// Configuração otimizada para produção no Vercel
const createPrismaClient = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Singleton pattern para evitar múltiplas instâncias
declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma || createPrismaClient();

if (process.env.NODE_ENV === "development") {
  globalThis.__prisma = prisma;
}

// Função para reconectar em caso de erro
export const reconnectPrisma = async () => {
  try {
    await prisma.$disconnect();
    const newPrisma = createPrismaClient();
    return newPrisma;
  } catch (error) {
    console.error("Erro ao reconectar Prisma:", error);
    throw error;
  }
};

// Middleware para lidar com erros de conexão
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Se for erro de conexão, tenta novamente
      if (
        error instanceof Error &&
        (error.message.includes("connection") ||
          error.message.includes("timeout") ||
          error.message.includes("ECONNRESET") ||
          error.message.includes("ENOTFOUND"))
      ) {
        if (attempt < maxRetries) {
          console.warn(
            `Tentativa ${attempt} falhou, tentando novamente em ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
          continue;
        }
      }

      // Se não for erro de conexão ou esgotaram as tentativas, relança o erro
      throw error;
    }
  }

  throw lastError!;
};

export default prisma;
