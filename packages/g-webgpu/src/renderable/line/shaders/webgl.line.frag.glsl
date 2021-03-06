uniform float u_dash_array : 0.02;
uniform float u_dash_offset : 0;
uniform float u_dash_ratio : 0;
uniform float u_thickness : 0.02;

varying vec4 v_color;
varying vec2 v_normal;
varying float v_counters;

void main() {
    float blur = 1. - smoothstep(0.98, 1., length(v_normal));

    gl_FragColor = v_color;
    gl_FragColor.a *= blur * ceil(mod(v_counters + u_dash_offset, u_dash_array) - (u_dash_array * u_dash_ratio));
}