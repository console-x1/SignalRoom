const criticalKeywords = [
  "war", "attack", "missile", "explosion",
  "earthquake", "tsunami", "hurricane",
  "sanctions", "emergency", "evacuation",
  "dead", "death", "killed", "crash", "missing",
  "military", "troops", "strike", "cyberattack", 
  "blackout", "hostage", "nuclear", "radiation", 
  "pandemic", "killing", "shooting", "bombing",
  "killer", "terrorism", "extremist", "crucial", 
  "critical", "urgent", "devastating", "catastrophic",
  "disaster", "massive", "severe", "widespread",
  "unprecedented", "historic", "major", "deadly", 
  "fatal", "lethal", "devastation", "destruction",
  "evacuation", "threat", "danger",
  "crisis", "emergency", "disaster",
  "collapse", "failure", "breakdown", "trillions",
  "contamination", "arrest", "scandal", "billions",
  "explosion", "fire", "flood", "disease", "solder", 
  "outbreak", "pandemic", "recall", "risk", "crash",
  "drought", "famine", "shortage", "breach",
  "leak", "allies", "sanctions", "corruption",
  "gas", "oil", "energy", "prices", "inflation", 
  "economy", "mafia", "murder", "assassination",
  "extortion", "drug", "trafficking", "smuggling",
  "human trafficking", "slavery", "genocide",
  "escalate", "escalation", "leader", "president", 
  "prime minister", "dictator", "nuclear", "missile", 
  "weapon", "arms", "military", "verdict", "trial", 
  "planes", "ships", "submarines", "drones", "target", 
];

const mediumKeywords = [
  "injured", "damage", "flood",
  "collapse", "alert", "signal",
  "disease", "outbreak", "recall",
  "storm", "fire", "protest", "rush",
  "security", "breach", "leak", "die",
  "arrest", "scandal", "corruption",
  "drought", "famine", "shortage",
  "energy", "food", "willingness",
  "prices", "inflation", "economy",
  "vulnerability", "openia", "spacex", 
  "tesla", "apple", "google", "amazon",
  "meta", "microsoft", "twitter", "sends",
  "hits back", "hit back", "responds", 
  "responding", "retaliates", "sever",
  "defence", "defend", "defending", "defends",
  "defense", "gouvernment"
];

export function scoreArticle(text, sourceWeight) {
  let score = 0;
  const lower = text.toLowerCase();

  criticalKeywords.forEach(k => {
    if (lower.includes(k)) score += 5;
  });

  mediumKeywords.forEach(k => {
    if (lower.includes(k)) score += 2;
  });

  return score * sourceWeight;
}