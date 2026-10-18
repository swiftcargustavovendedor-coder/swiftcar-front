(() => {
  const nativeFetch = window.fetch.bind(window);

  /*
   * URL DO BACKEND
   *
   * Local:
   * http://localhost:4173
   *
   * Produção:
   * depois vamos trocar pela URL do backend hospedado
   */
  const API_BASE =
    window.SWIFTCAR_API_URL ||
    "http://localhost:4173";

  const original = window.SWIFTCAR_CONFIG || {};

  window.SWIFTCAR_CONFIG = {
    ...original,
    apiBase: API_BASE,
    apiKey: "local-sql"
  };

  const response = (data, status = 200) =>
    new Response(
      data == null ? null : JSON.stringify(data),
      {
        status,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  window.fetch = async (input, options = {}) => {
    const source =
      typeof input === "string"
        ? input
        : input.url;

    const url = new URL(
      source,
      location.origin
    );

    const method = String(
      options.method || "GET"
    ).toUpperCase();

    const headers = new Headers(
      options.headers || {}
    );

    /*
     * Faz a requisição para o backend separado.
     */
    const request = (path, init = {}) => {
      const backendUrl = new URL(
        path,
        API_BASE
      ).toString();

      return nativeFetch(
        backendUrl,
        {
          ...options,
          ...init,
          headers
        }
      );
    };

    /*
     * AUTENTICAÇÃO
     */
    if (
      url.pathname === "/auth/v1/signup"
    ) {
      return request(
        "/api/auth/signup"
      );
    }

    if (
      url.pathname === "/auth/v1/token"
    ) {
      return request(
        "/api/auth/login"
      );
    }

    if (
      url.pathname === "/auth/v1/user"
    ) {
      const result = await request(
        "/api/auth/session"
      );

      if (!result.ok) {
        return result;
      }

      const data =
        await result.json();

      return response(
        data.user
      );
    }

    /*
     * PERMISSÃO ADMIN
     */
    if (
      url.pathname.startsWith(
        "/rest/v1/user_roles"
      )
    ) {
      const result =
        await request(
          "/api/auth/session"
        );

      return result.ok
        ? response([
            {
              role: "admin"
            }
          ])
        : response(
            [],
            401
          );
    }

    /*
     * VEÍCULOS
     */
    if (
      url.pathname.startsWith(
        "/rest/v1/vehicles"
      )
    ) {
      const id =
        url.searchParams
          .get("id")
          ?.replace(
            /^eq\./,
            ""
          );

      const slug =
        url.searchParams
          .get("slug")
          ?.replace(
            /^eq\./,
            ""
          );

      /*
       * Busca de veículo específico
       */
      if (
        method === "GET" &&
        (slug || id)
      ) {
        const result =
          await request(
            `/api/vehicles/${encodeURIComponent(
              slug || id
            )}`
          );

        if (!result.ok) {
          return response([]);
        }

        return response([
          await result.json()
        ]);
      }

      /*
       * Atualizar ou excluir veículo
       */
      if (
        (
          method === "PATCH" ||
          method === "DELETE"
        ) &&
        id
      ) {
        return request(
          `/api/vehicles/${encodeURIComponent(
            id
          )}`
        );
      }

      /*
       * Lista ou cria veículos
       */
      return request(
        "/api/vehicles"
      );
    }

    /*
     * LEADS
     */
    if (
      url.pathname.startsWith(
        "/rest/v1/leads"
      )
    ) {
      const id =
        url.searchParams
          .get("id")
          ?.replace(
            /^eq\./,
            ""
          );

      return request(
        id
          ? `/api/leads/${encodeURIComponent(
              id
            )}`
          : "/api/leads"
      );
    }

    /*
     * IMAGENS DOS VEÍCULOS
     */
    if (
      url.pathname.startsWith(
        "/rest/v1/vehicle_images"
      )
    ) {
      if (
        method === "POST"
      ) {
        return response(
          null,
          204
        );
      }

      const vehicleId =
        url.searchParams
          .get("vehicle_id")
          ?.replace(
            /^eq\./,
            ""
          );

      if (!vehicleId) {
        return response([]);
      }

      const result =
        await request(
          `/api/vehicles/${encodeURIComponent(
            vehicleId
          )}`
        );

      if (!result.ok) {
        return response([]);
      }

      const vehicle =
        await result.json();

      return response(
        vehicle.vehicle_images ||
          []
      );
    }

    /*
     * STORAGE / IMAGENS PÚBLICAS
     */
    const storagePrefix =
      "/storage/v1/object/";

    if (
      url.pathname.startsWith(
        storagePrefix +
          "public/vehicle-images/"
      )
    ) {
      const filename =
        url.pathname.split(
          "/vehicle-images/"
        )[1];

      return request(
        `/uploads/${filename}`
      );
    }

    /*
     * UPLOAD DE IMAGENS
     */
    if (
      url.pathname.startsWith(
        storagePrefix +
          "vehicle-images/"
      )
    ) {
      const filename =
        url.pathname.split(
          "/vehicle-images/"
        )[1];

      return request(
        `/api/uploads/${filename}`
      );
    }

    /*
     * IMPORTANTE:
     *
     * Chamadas diretas para /api/*
     * também precisam ir para o backend
     * separado.
     *
     * Exemplo:
     * /api/vehicles
     *
     * vira:
     * http://localhost:4173/api/vehicles
     */
    if (
      url.pathname.startsWith(
        "/api/"
      )
    ) {
      return request(
        url.pathname +
          url.search
      );
    }

    /*
     * Imagens diretas em /uploads/*
     * também vêm do backend.
     */
    if (
      url.pathname.startsWith(
        "/uploads/"
      )
    ) {
      return request(
        url.pathname +
          url.search
      );
    }

    /*
     * Qualquer outra requisição
     * continua normalmente no frontend.
     */
    return nativeFetch(
      input,
      options
    );
  };
})();