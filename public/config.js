// Remote shared store for GitHub Pages (and optional dual-write from local).
// MantleDB namespace is claimed for this school demo. The write key is PUBLIC on purpose
// so the static site can append answers without a private backend.
// Do not reuse this key for anything sensitive.
window.TREE_SURVEY_CONFIG = {
  remote: {
    provider: "mantledb",
    baseUrl: "https://mantledb.sh/v2",
    namespace: "polina-tree-survey-ng",
    key: "f9e0d4bbe09accb34aa33605c506a03383e326a0fad73c1d0a1a9ba88ad3490a",
  },
};
