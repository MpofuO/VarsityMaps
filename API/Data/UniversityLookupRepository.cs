using API.Entities;
using API.Interfaces;

namespace API.Data;

public class UniversityLookupRepository(AppDbContext context)
    : BaseRepository<UniversityLookup>(context), IUniversityLookupRepository;