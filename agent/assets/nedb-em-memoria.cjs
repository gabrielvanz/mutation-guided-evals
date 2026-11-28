// Bancos NeDB com a semente versionada carregada em memória e SEM gravação em disco: cada processo de teste parte do
// mesmo estado e nenhum teste altera src/data. Carregado com `node --require` / `mocha --require`.
const Module = require("module");
const orig = Module._load;
Module._load = function (request) {
  const mod = orig.apply(this, arguments);
  if (request === "nedb-promises" && mod && !mod.__semDisco) {
    const create = mod.create;
    mod.create = function (opts) {
      const o = opts && typeof opts === "object" ? { ...opts, autoload: false } : opts;
      const ds = create.call(this, o);
      if (o && typeof o === "object" && o.filename) {
        const persistence = ds.__original.persistence;
        persistence.persistNewStateAsync = async () => {};
        persistence.persistCachedDatabaseAsync = async () => {};
        if (opts.autoload) ds.load().catch(() => {});
      }
      return ds;
    };
    mod.__semDisco = true;
  }
  return mod;
};
