export const paginate = <T>(
    data: T[],
    page: number,
    itemsPerPage: number
  ): T[] => data.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  
  export const search = <T>(
    data: T[],
    query: string,
    fields: (keyof T)[]
  ): T[] => {
    const lowerQuery = query.toLowerCase();
    return data.filter((item) =>
      fields.some((field) => item[field]?.toString().toLowerCase().includes(lowerQuery))
    );
  };
  
  export const filter = <T>(
    data: T[],
    filters: Partial<T>
  ): T[] => {
    return data.filter((item) =>
      Object.entries(filters).every(([key, value]) =>
        value ? item[key as keyof T] === value : true
      )
    );
  };
  