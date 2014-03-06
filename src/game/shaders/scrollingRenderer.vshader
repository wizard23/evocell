attribute vec3 aPos;
attribute vec2 aTexCoord;	
varying vec2 vTexCoord;
uniform vec2 translate;
uniform vec2 scale;

const vec2 xxx = vec2(0.1, 1);
const float rot = 0.5;
vec2 roted;

void main(void) {
	gl_Position = vec4(aPos, 1.);
	vTexCoord = aTexCoord*scale+translate;
	vTexCoord = vec2(cos(rot) * vTexCoord.x + vTexCoord.y * sin(rot), 
		cos(rot) * vTexCoord.y + vTexCoord.x * -sin(rot));
	//vTexCoord = aTexCoord +xxx;
	gl_PointSize = 2.0;
}