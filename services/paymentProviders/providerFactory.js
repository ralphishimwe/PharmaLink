exports.getProvider = (providerName = "stripe") => {
  if (providerName === "stripe") return require("./stripeProvider");
  throw new Error(`Unsupported payment provider: ${providerName}`);
};
