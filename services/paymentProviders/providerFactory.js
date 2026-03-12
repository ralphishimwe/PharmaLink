exports.getProvider = (providerName = "irembopay") => {
  if (providerName === "irembopay") return require("./irembopayProvider");
  throw new Error(`Unsupported payment provider: ${providerName}`);
};

