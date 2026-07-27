function stubhubSearchUrl(bandName, city) {
  const query = city ? `${bandName} ${city}` : bandName;
  return `https://www.stubhub.com/find/s/?q=${encodeURIComponent(query)}`;
}

module.exports = { stubhubSearchUrl };
