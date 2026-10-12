/*
 * Ícones em pixel art (9x9) dos balões do Pyter.
 * Cada letra em "rows" é uma cor de "colors"; "." é transparente.
 */
export const PIXEL_ICONS = {
	feliz: { colors: { y: "#ffd23f", k: "#222" }, rows: [
		"..yyyyy..", ".yyyyyyy.", "yykyyykyy", "yykyyykyy", "yyyyyyyyy", "ykyyyyyky", "yykkkkkyy", ".yyyyyyy.", "..yyyyy..",
	] },
	coracao: { colors: { r: "#ff3b6b", w: "#ffd1dc" }, rows: [
		".rr...rr.", "rwrr.rrrr", "rwrrrrrrr", "rrrrrrrrr", "rrrrrrrrr", ".rrrrrrr.", "..rrrrr..", "...rrr...", "....r....",
	] },
	estrela: { colors: { y: "#ffcf26", w: "#fff6c2" }, rows: [
		"....y....", "....y....", "...yyy...", "yyyywyyyy", ".yyywyyy.", "..yyyyy..", "..yy.yy..", ".yy...yy.", ".y.....y.",
	] },
	musica: { colors: { k: "#3b3b8f" }, rows: [
		"....kkkkk", "....kkkkk", "....k...k", "....k...k", "....k...k", ".kkkk.kkk", "kkkkkkkkk", "kkkk.kkkk", ".kk...kk.",
	] },
	susto: { colors: { r: "#ff4d4d" }, rows: [
		"...rrr...", "...rrr...", "...rrr...", "...rrr...", "...rrr...", "....r....", ".........", "...rrr...", "...rrr...",
	] },
	amor: { colors: { r: "#ff3b6b", p: "#ff8fb1" }, rows: [
		"rr.rr....", "rrrrr....", ".rrr.pp.p", "..r..pppp", ".....ppp.", "......p..", ".........", ".........", ".........",
	] },
};
PIXEL_ICONS.duvida = { colors: { b: "#3b82f6" }, rows: [
	"..bbbbb..", ".bb...bb.", ".bb...bb.", "......bb.", "....bbb..", "...bb....", "...bb....", ".........", "...bb....",
] };
// "zzz" enquanto dorme: Z grande embaixo, z pequeno subindo
PIXEL_ICONS.zzz = { colors: { z: "#5b6bd6", l: "#9aa6f0" }, rows: [
	"......lll", ".......l.", "......lll", ".........", "zzzzz....", "...z.....", "..z......", ".z.......", "zzzzz....",
] };
export const REACTIONS = ["feliz", "coracao", "estrela", "musica", "susto", "amor"];
