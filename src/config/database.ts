// Simulação de banco de dados em memória para usuários
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "admin" | "user";
  createdAt: Date;
}

// Dados simulados de usuários
export const users: User[] = [
  {
    id: "1",
    email: "admin@volleyball.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    name: "Administrador",
    role: "admin",
    createdAt: new Date(),
  },
  {
    id: "2",
    email: "user@volleyball.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    name: "Usuário Padrão",
    role: "user",
    createdAt: new Date(),
  },
];

export const findUserByEmail = (email: string): User | undefined => {
  return users.find((user) => user.email === email);
};

export const findUserById = (id: string): User | undefined => {
  return users.find((user) => user.id === id);
};
