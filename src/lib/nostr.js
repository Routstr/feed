// Utility to fetch a user's following list (Nostr kind 3 contact list)
// Uses nostr-tools SimplePool to query multiple relays and returns npub-encoded keys

import { nip19 } from 'nostr-tools'
import { SimplePool } from 'nostr-tools'

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://eden.nostr.land'
]

function decodeNpubToHex(npub) {
  try {
    const decoded = nip19.decode(npub)
    if (decoded.type !== 'npub') return null
    return decoded.data
  } catch (err) {
    console.warn('Failed to decode npub:', err)
    return null
  }
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve(undefined), timeoutMs)
    promise
      .then((v) => {
        clearTimeout(t)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(t)
        reject(e)
      })
  })
}

export async function fetchFollowingForNpub(npub, { relays = DEFAULT_RELAYS, timeoutMs = 7000 } = {}) {
  const authorHex = decodeNpubToHex(npub)
  if (!authorHex) return []

  const pool = new SimplePool()
  try {
    const event = await withTimeout(
      pool.get(relays, { kinds: [3], authors: [authorHex] }),
      timeoutMs
    )

    if (!event) return []

    const followingHex = new Set()
    for (const tag of event.tags || []) {
      if (Array.isArray(tag) && tag[0] === 'p' && tag[1]) {
        followingHex.add(tag[1])
      }
    }

    const npubs = []
    for (const hex of followingHex) {
      try {
        npubs.push(nip19.npubEncode(hex))
      } catch (_) {
        // skip invalid
      }
    }
    return npubs
  } catch (err) {
    console.warn('Failed to fetch following list:', err)
    return []
  } finally {
    try {
      pool.close(relays)
    } catch (_) {}
  }
}


