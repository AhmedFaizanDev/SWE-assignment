from django.core.management.base import BaseCommand

from ai.rag import build_and_store_rag_index


class Command(BaseCommand):
    help = "Build/refresh persistent RAG index for chatbot retrieval."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force-reembed",
            action="store_true",
            help="Recompute embeddings for all active chunks, even unchanged ones.",
        )

    def handle(self, *args, **options):
        stats = build_and_store_rag_index(force_reembed=options["force_reembed"])
        self.stdout.write(
            self.style.SUCCESS(
                f"RAG index ready: active={stats['activeChunks']}, "
                f"updated={stats['updatedOrCreated']}, embedded={stats['embedded']}"
            )
        )
        if stats.get("embeddingError"):
            self.stdout.write(self.style.WARNING(f"Embedding warning: {stats['embeddingError']}"))

