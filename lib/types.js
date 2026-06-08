// Shared data shapes (JSDoc typedefs for editor hints — no runtime cost).

/**
 * @typedef {Object} Target
 * @property {string} id            Stable id (MMSI in production)
 * @property {string} name          Vessel name ("" if unknown)
 * @property {string} type          Class / vessel type label
 * @property {number} brg           Bearing from own vessel (deg true)
 * @property {number} dist          Range from own vessel (nm)
 * @property {number} cog           Course over ground (deg true)
 * @property {number} sog           Speed over ground (kt)
 * @property {number} vx            Relative velocity east (nm/min)
 * @property {number} vy            Relative velocity north (nm/min)
 * @property {boolean} aton         True for Aids to Navigation (stationary)
 */

/**
 * @typedef {Target & {
 *   rx:number, ry:number, cpa:number, tcpa:number,
 *   level:("safe"|"caution"|"danger")
 * }} EnrichedTarget
 */

/**
 * @typedef {Object} OwnVessel
 * @property {number} sog
 * @property {number} cog
 * @property {number} heading
 * @property {number} depth
 */

export {};
