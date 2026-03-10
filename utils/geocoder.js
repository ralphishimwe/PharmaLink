const NodeGeocoder = require("node-geocoder");

const options = {
  provider: "openstreetmap", // free option; alternatives: 'google', 'mapbox'
};

module.exports = NodeGeocoder(options);
