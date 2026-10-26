"""
Database Migration: Hiring Pipelines & Sequential Gating Collections

Creates:
1. pipelines
2. pipeline_rounds
3. candidate_applications
4. candidate_round_attempts
5. round_scores
6. pipeline_overrides

Adds indexes and seeds default 6-round hiring pipelines for primary roles.
Usage:
    cd backend
    python migrations/migrate_pipeline_tables.py
"""

import os
import sys
from pathlib import Path
from pymongo import MongoClient, ASCENDING, DESCENDING
from dotenv import load_dotenv

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

load_dotenv()

from db.pipeline_models import PipelineCollections, DEFAULT_ROUNDS_CONFIG


def run_pipeline_migration():
    print("=" * 80)
    print("🚀 RUNNING PIPELINE DATABASE MIGRATION")
    print("=" * 80)

    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    mongo_db_name = os.getenv('MONGO_DB_NAME', 'resumate_db')

    print(f"Connecting to MongoDB at: {mongo_uri}")
    print(f"Database target: {mongo_db_name}")

    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2500)
        # Test connection
        client.admin.command('ping')
        db = client[mongo_db_name]
        print("✅ Connected to MongoDB successfully!")
    except Exception as e:
        print(f"⚠️  MongoDB connection warning: {e}")
        print("Note: In-memory fallback is active in PipelineRepository for offline development/standalone testing.")
        return

    # 1. Ensure Collections Exist
    existing_collections = db.list_collection_names()
    target_collections = [
        PipelineCollections.PIPELINES,
        PipelineCollections.PIPELINE_ROUNDS,
        PipelineCollections.CANDIDATE_APPLICATIONS,
        PipelineCollections.CANDIDATE_ROUND_ATTEMPTS,
        PipelineCollections.ROUND_SCORES,
        PipelineCollections.PIPELINE_OVERRIDES
    ]

    for col in target_collections:
        if col not in existing_collections:
            db.create_collection(col)
            print(f"✨ Created collection: {col}")
        else:
            print(f"✅ Collection already exists: {col}")

    # 2. Create Indexes
    print("\n📊 Creating Performance & Gating Indexes...")

    # pipelines: pipeline_id unique, job_role indexed
    db[PipelineCollections.PIPELINES].create_index([("pipeline_id", ASCENDING)], unique=True, name="pipeline_id_unique")
    db[PipelineCollections.PIPELINES].create_index([("job_role", ASCENDING)], name="job_role_idx")

    # pipeline_rounds: pipeline_id + order compound unique
    db[PipelineCollections.PIPELINE_ROUNDS].create_index([("round_id", ASCENDING)], unique=True, name="round_id_unique")
    db[PipelineCollections.PIPELINE_ROUNDS].create_index(
        [("pipeline_id", ASCENDING), ("order", ASCENDING)],
        unique=True,
        name="pipeline_round_order_unique"
    )

    # candidate_applications: application_id unique, candidate_email + pipeline_id compound
    db[PipelineCollections.CANDIDATE_APPLICATIONS].create_index([("application_id", ASCENDING)], unique=True, name="app_id_unique")
    db[PipelineCollections.CANDIDATE_APPLICATIONS].create_index([("candidate_email", ASCENDING), ("pipeline_id", ASCENDING)], name="email_pipeline_idx")
    db[PipelineCollections.CANDIDATE_APPLICATIONS].create_index([("status", ASCENDING)], name="status_idx")

    # candidate_round_attempts: attempt_id unique, application_id + round_id compound
    db[PipelineCollections.CANDIDATE_ROUND_ATTEMPTS].create_index([("attempt_id", ASCENDING)], unique=True, name="attempt_id_unique")
    db[PipelineCollections.CANDIDATE_ROUND_ATTEMPTS].create_index(
        [("application_id", ASCENDING), ("round_id", ASCENDING)],
        name="app_round_idx"
    )
    db[PipelineCollections.CANDIDATE_ROUND_ATTEMPTS].create_index([("status", ASCENDING)], name="attempt_status_idx")

    # round_scores: score_id unique, attempt_id indexed
    db[PipelineCollections.ROUND_SCORES].create_index([("score_id", ASCENDING)], unique=True, name="score_id_unique")
    db[PipelineCollections.ROUND_SCORES].create_index([("attempt_id", ASCENDING)], name="attempt_score_idx")

    # pipeline_overrides: override_id unique, application_id indexed
    db[PipelineCollections.PIPELINE_OVERRIDES].create_index([("override_id", ASCENDING)], unique=True, name="override_id_unique")
    db[PipelineCollections.PIPELINE_OVERRIDES].create_index([("application_id", ASCENDING)], name="app_override_idx")

    print("✅ All indexes created successfully!")

    # 3. Seed Default Pipelines for Existing Roles
    print("\n🌱 Seeding Standard Role Pipelines...")
    from repositories.pipeline_repository import PipelineRepository
    repo = PipelineRepository()

    standard_roles = [
        "Machine Learning Engineer",
        "Frontend Developer",
        "Backend Engineer",
        "Data Analyst"
    ]

    for role in standard_roles:
        p = repo.get_or_create_default_pipeline(role)
        print(f"  • {role}: Pipeline ID {p['pipeline_id']} with {len(p.get('rounds', []))} rounds calibrated.")

    print("\n" + "=" * 80)
    print("🎉 PIPELINE MIGRATION COMPLETED SUCCESSFULLY")
    print("=" * 80)


if __name__ == "__main__":
    run_pipeline_migration()
