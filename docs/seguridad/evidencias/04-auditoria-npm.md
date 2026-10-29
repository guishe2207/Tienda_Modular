# Auditoría npm real

Comandos ejecutados:

```text
npm --prefix backend audit --omit=dev   -> found 0 vulnerabilities
npm --prefix frontend audit --omit=dev  -> found 0 vulnerabilities
```

`npm outdated` se ejecutó posteriormente con acceso al registro. Hay actualizaciones compatibles disponibles: backend `express` 5.2.1→5.3.0, `pg` 8.23.0→8.23.1 y `supertest` 7.3.0→7.3.1; frontend Angular 22.2.0→22.2.x, CLI/build 22.2.5 y actualizaciones menores de `prettier`/`vitest`. No se aplicaron durante el laboratorio: requieren actualización coordinada y nueva regresión. Las actualizaciones mayores se documentan como evaluación futura. No se usó `npm audit fix --force`.
