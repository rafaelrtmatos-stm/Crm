import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';

import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestoreDbId = (firebaseConfig as any)?.firestoreDatabaseId;

// Cache offline (IndexedDB) do Firestore — sem isso, o onSnapshot (empresas, usuarios,
// mensagens, sessoes etc) nao tem nenhum dado pra devolver enquanto o app estiver sem
// internet, mesmo que ja tenha sido carregado com sucesso antes. Com o cache persistente
// habilitado, o Firestore guarda localmente o ultimo resultado conhecido de cada consulta
// e o onSnapshot volta a disparar com esses dados na hora, offline, ate a conexao voltar
// e ele re-sincronizar sozinho. `persistentMultipleTabManager` deixa varias abas/telas do
// mesmo navegador compartilharem esse cache em vez de brigarem pelo IndexedDB.
function createFirestoreDb(): Firestore {
  try {
    return firestoreDbId && typeof firestoreDbId === 'string' && firestoreDbId.trim() !== ''
      ? initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        }, firestoreDbId)
      : initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        });
  } catch (e) {
    // Navegador sem suporte a IndexedDB (modo anonimo restrito, versao muito antiga, etc)
    // ou Firestore ja inicializado antes com outras settings — cai pro modo normal
    // (sem persistencia offline, mas o app continua funcionando online).
    return firestoreDbId && typeof firestoreDbId === 'string' && firestoreDbId.trim() !== ''
      ? getFirestore(app, firestoreDbId)
      : getFirestore(app);
  }
}

export const db: Firestore = createFirestoreDb();
export const auth = getAuth(app);

// Ping de conexão removido: ele disparava uma requisição getDocFromServer
// a cada load do app só para "testar" a conexão, e essa requisição extra
// era uma das causas dos ERR_QUIC_PROTOCOL_ERROR no console. O restante do
// ecossistema (leads/funil/etapas, produtos, config, vendas etc.) já roda
// 100% no Supabase; o Firestore aqui segue em uso só onde o app ainda
// depende dele de fato (auth bootstrap do admin master, sessions, services,
// tasks, contratos, mensagens e Robozinho).

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
