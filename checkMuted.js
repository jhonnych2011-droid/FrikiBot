// checkMuted.js
// Helper para verificar si un sub-bot debe responder en un grupo
import fs from 'fs';

const mutedGroupsPath = './muted_groups.json';

export function getMutedGroups() {
  if (!fs.existsSync(mutedGroupsPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(mutedGroupsPath, 'utf8'));
  } catch(e) {
    return {};
  }
}

export function isGroupMutedForSession(sessionNum, groupJid) {
  const muted = getMutedGroups();
  const sessionKey = `session${sessionNum}`;
  return muted[sessionKey] && muted[sessionKey].includes(groupJid);
}

export function shouldRespondInGroup(sessionNum, groupJid) {
  // Si el grupo NO está silenciado, debe responder
  return !isGroupMutedForSession(sessionNum, groupJid);
}
