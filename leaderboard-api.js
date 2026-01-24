import { openDB } from 'https://esm.sh/idb@7';

const DB_NAME = 'CircleTapDB';
const STORE_NAME = 'scores';
const DB_VERSION = 1;

async function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('difficulty', 'difficulty');
                store.createIndex('score', 'score');
                store.createIndex('timestamp', 'timestamp');
            }
        },
    });
}

// Local user "profile" simulation
const LOCAL_USER = {
    username: 'You',
    avatarUrl: null 
};

export async function submitScore(lastGameData, onSuccess, onError) {
    try {
        const db = await getDB();
        
        // Strip out heavy replay frames for the list view, but keep them for replay playback if we want full local storage
        // For a simple IDB, we can store the whole thing.
        // But for "submit", we usually just want the metadata + replay frames.
        
        const scoreEntry = {
            ...lastGameData,
            timestamp: new Date().toISOString(),
            username: LOCAL_USER.username // Tag locally
        };

        // Don't need to upload file, just store object locally
        await db.add(STORE_NAME, scoreEntry);
        
        if (onSuccess) onSuccess();
    } catch (e) {
        console.error("Error submitting to IndexedDB:", e);
        if (onError) onError(e);
    }
}

export async function fetchLeaderboard(difficulty) {
    try {
        const db = await getDB();
        const allScores = await db.getAllFromIndex(STORE_NAME, 'difficulty', difficulty);
        
        // Since it's single player, the leaderboard is just "Your Best Scores" basically.
        // We'll mimic the structure expected by the UI (array of player objects).
        // Since we only have "You", it will be a list of 1 player with many scores.
        
        if (allScores.length === 0) return [];

        // Sort descending
        allScores.sort((a, b) => b.score - a.score);

        // Find best game
        const bestGame = allScores[0];
        
        const playerProfile = {
            username: LOCAL_USER.username,
            highestScore: bestGame.score,
            bestLevel: bestGame.level,
            gamesPlayed: allScores.length,
            bestGameData: bestGame,
            allScores: allScores
        };

        return [playerProfile];

    } catch (e) {
        console.error("Error fetching leaderboard:", e);
        return [];
    }
}

export async function fetchUserProfile(username) {
    // In single player, there is only one user profile: the local one.
    // We aggregate all scores from DB to build the profile object expected by UI.
    
    try {
        const db = await getDB();
        const allScores = await db.getAll(STORE_NAME);
        
        const profile = {
            username: LOCAL_USER.username,
            easy: allScores.filter(s => s.difficulty === 'easy'),
            medium: allScores.filter(s => s.difficulty === 'medium'),
            hard: allScores.filter(s => s.difficulty === 'hard')
        };
        
        return profile;
    } catch (e) {
        console.error("Error fetching profile:", e);
        return null;
    }
}

export async function syncScores() {
    // No-op for local DB
    return; 
}

export async function migrateUserScores() {
    // No-op for local DB refactor
    return;
}